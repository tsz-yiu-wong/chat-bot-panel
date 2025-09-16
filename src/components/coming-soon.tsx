import { CircleAlert } from 'lucide-react';

export default function ComingSoon() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-background text-foreground">
      <div className="mb-2 flex h-24 w-24 items-center justify-center rounded-full">
        <CircleAlert className="h-12 w-12 text-yellow-500" />
      </div>
      <h1 className="mb-2 text-4xl font-bold">暂未开放</h1>
      <p className="text-lg text-neutral-400">该页面正在开发中...</p>
    </div>
  );
}
