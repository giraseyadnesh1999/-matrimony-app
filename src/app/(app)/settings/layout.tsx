import type { Metadata } from "next";
import { SettingsTabs } from "./_components/settings-tabs";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-4xl leading-tight tracking-tight">Settings</h1>
      <SettingsTabs />
      {children}
    </div>
  );
}
