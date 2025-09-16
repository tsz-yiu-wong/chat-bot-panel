'use client';

import dynamic from 'next/dynamic';

const Sidebar = dynamic(
  () => import('@/components/layout/sidebar').then((mod) => mod.Sidebar),
  {
    ssr: false,
    loading: () => <aside className="fixed inset-y-0 left-0 z-10 hidden w-46 flex-col border-r bg-card sm:flex" />,
  }
);

export default Sidebar;
