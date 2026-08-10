import { BrainDumpChat } from "@/components/braindump/BrainDumpChat";

export default function BrainDumpPage() {
  return (
    <div className="flex flex-col gap-4">
      <p className="px-1 text-sm text-gray-500 dark:text-gray-400">
        Type or dictate whatever&apos;s on your mind — tasks, appointments, dinner ideas, all
        mixed together. It&apos;ll sort them out for you to review before anything&apos;s saved.
      </p>
      <BrainDumpChat />
    </div>
  );
}
