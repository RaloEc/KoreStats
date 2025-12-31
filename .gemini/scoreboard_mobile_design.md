# Diseño Móvil del Scoreboard

## Estructura del layout móvil (basado en ScoreboardModalTable):

```
[Avatar+Spells] [Runas+Badge] [Nombre/Champ/Rank] [KDA] [Items Grid] [Trinket] [Actions]
```

### Características clave:

- Avatar 32px (w-8 h-8)
- Spells debajo en fila horizontal (14px cada uno)
- Runas verticales al lado con badge de ranking
- Grid de items 3x2
- Espaciado compacto con gap-1.5 a gap-2
- Padding py-1.5 px-2
- Items de 16px (w-4 h-4)
- KDA y ratio apilados verticalmente
