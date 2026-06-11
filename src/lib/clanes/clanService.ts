import { createClient } from '@/lib/supabase/client';
import { Clan, ClanMember, ClanApplication, ClanGame, JoinPolicy } from '@/types/clanes';

export const clanService = {
  // Obtener lista de clanes (con filtros opcionales)
  async getClanes(options?: { game?: ClanGame; searchQuery?: string; limit?: number }) {
    const supabase = createClient();
    let query = supabase
      .from('clans')
      .select('*, owner:perfiles!owner_id(id, username, avatar_url, role), clan_members(count)');

    if (options?.game) {
      query = query.eq('game', options.game);
    }
    
    if (options?.searchQuery) {
      query = query.ilike('name', `%${options.searchQuery}%`);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    // Normalizar members_count desde el array count de Supabase
    return (data ?? []).map((clan: any) => ({
      ...clan,
      members_count: clan.clan_members?.[0]?.count ?? 0,
      clan_members: undefined,
    })) as unknown as Clan[];
  },


  // Obtener detalle de un clan por tag
  async getClanByTag(tag: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('clans')
      .select('*, owner:perfiles!owner_id(id, username, avatar_url, role)')
      .eq('tag', tag)
      .single();

    if (error) throw error;
    return data as unknown as Clan;
  },

  // Obtener los miembros de un clan
  async getClanMembers(clanId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('clan_members')
      .select('*, perfil:perfiles!user_id(id, username, avatar_url, role)')
      .eq('clan_id', clanId);

    if (error) throw error;
    return data as unknown as ClanMember[];
  },

  // Crear un clan nuevo
  async createClan(clanData: {
    name: string;
    tag: string;
    description: string;
    game: ClanGame;
    discord_url?: string;
    join_policy: JoinPolicy;
    require_exclusive: boolean;
    requirements: any;
    owner_id: string;
  }) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('clans')
      .insert([clanData])
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Clan;
  },

  // Unirse a un clan directamente (si es open)
  async joinClan(clanId: string, userId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('clan_members')
      .insert([{ clan_id: clanId, user_id: userId, role: 'member' }])
      .select()
      .single();

    if (error) throw error;
    return data as unknown as ClanMember;
  },

  // Enviar solicitud de ingreso (si es apply)
  async applyToClan(clanId: string, userId: string, message: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('clan_applications')
      .insert([{ clan_id: clanId, user_id: userId, type: 'application', message }])
      .select()
      .single();

    if (error) throw error;
    return data as unknown as ClanApplication;
  },

  // Obtener mis clanes
  async getMyClans(userId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('clan_members')
      .select('*, clan:clans(*)')
      .eq('user_id', userId);

    if (error) throw error;
    return data as unknown as ClanMember[];
  },

  // Actualizar datos de un clan
  async updateClan(clanId: string, clanData: Partial<{
    name: string;
    description: string | null;
    discord_url: string | null;
    join_policy: JoinPolicy;
    require_exclusive: boolean;
    requirements: any;
    logo_url: string | null;
    banner_url: string | null;
  }>) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('clans')
      .update(clanData)
      .eq('id', clanId)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Clan;
  },

  // Reportar clan por contenido inadecuado
  async reportClan(
    clanId: string,
    reason: string,
    reportedItem: 'logo' | 'banner' | 'general',
    description?: string
  ) {
    const response = await fetch(`/api/clanes/${clanId}/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason, reported_item: reportedItem, description }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Error al enviar el reporte');
    }
    return result;
  },

  // Verificar si un usuario ya ha creado un clan
  async hasCreatedClan(userId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('clans')
      .select('id')
      .eq('owner_id', userId)
      .limit(1);

    if (error) throw error;
    return (data && data.length > 0);
  },

  // Obtener solicitudes pendientes de un clan (solo para oficiales/líderes)
  async getClanApplications(clanId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('clan_applications')
      .select('*, perfil:perfiles!user_id(id, username, avatar_url, role)')
      .eq('clan_id', clanId)
      .eq('type', 'application')
      .eq('status', 'pending');

    if (error) throw error;
    return data as unknown as ClanApplication[];
  },

  // Responder a una solicitud (aceptar/rechazar)
  async respondToApplication(applicationId: string, status: 'accepted' | 'rejected', clanId: string, userId: string) {
    const supabase = createClient();
    
    // 1. Actualizar estado de la solicitud
    const { data, error } = await supabase
      .from('clan_applications')
      .update({ status })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) throw error;

    // 2. Si es aceptada, añadir al miembro en la tabla clan_members
    if (status === 'accepted') {
      const { error: memberError } = await supabase
        .from('clan_members')
        .insert([{ clan_id: clanId, user_id: userId, role: 'member' }]);
      
      if (memberError) throw memberError;
    }

    return data as unknown as ClanApplication;
  },

  // Expulsar a un miembro del clan
  async kickMember(clanId: string, userId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('clan_members')
      .delete()
      .eq('clan_id', clanId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  },

  // Cambiar el rol de un miembro (promover/degradar)
  async updateMemberRole(clanId: string, userId: string, newRole: 'officer' | 'member') {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('clan_members')
      .update({ role: newRole })
      .eq('clan_id', clanId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as ClanMember;
  },

  // Actualizar los nombres de roles personalizados
  async updateRoleNames(clanId: string, roleNames: { leader: string; officer: string; member: string }) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('clans')
      .update({ role_names: roleNames })
      .eq('id', clanId)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Clan;
  },

  // Eliminar/Disolver un clan
  async deleteClan(clanId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('clans')
      .delete()
      .eq('id', clanId);

    if (error) throw error;
    return true;
  }
};
