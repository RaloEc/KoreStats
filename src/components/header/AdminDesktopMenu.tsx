import React from "react";
import Link from "next/link";

interface AdminDesktopMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  profile?: {
    color?: string;
  } | null;
  menuRef: React.RefObject<HTMLLIElement>;
}

export const AdminDesktopMenu: React.FC<AdminDesktopMenuProps> = ({
  isOpen,
  onToggle,
  onClose,
  profile,
  menuRef,
}) => {
  return (
    <li className="relative" ref={menuRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="px-4 py-2 transition font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg"
        onClick={onToggle}
      >
        Admin
      </button>
      <div
        className={`absolute top-full left-0 mt-1 w-56 rounded-md border shadow-lg bg-white dark:bg-black border-gray-200 dark:border-gray-800 transition-all duration-200 ease-in-out transform origin-top-left ${
          isOpen
            ? "scale-100 opacity-100"
            : "scale-95 opacity-0 pointer-events-none"
        }`}
      >
        <ul className="py-2 text-sm">
          <li className="menu-item">
            <Link
              href="/admin/dashboard"
              className="block px-4 py-2 transition-colors text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400"
              onClick={onClose}
            >
              Dashboard
            </Link>
          </li>
          <li className="menu-item">
            <Link
              href="/admin/noticias"
              className="block px-4 py-2 transition-colors text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400"
              onClick={onClose}
            >
              Admin Noticias
            </Link>
          </li>
          <li className="menu-item">
            <Link
              href="/admin/usuarios"
              className="block px-4 py-2 transition-colors text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400"
              onClick={onClose}
            >
              Admin Usuarios
            </Link>
          </li>
          <li className="menu-item">
            <Link
              href="/admin/foro"
              className="block px-4 py-2 transition-colors text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400"
              onClick={onClose}
            >
              Admin Foro
            </Link>
          </li>
        </ul>
      </div>
    </li>
  );
};
