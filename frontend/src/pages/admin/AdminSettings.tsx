import { Settings } from 'lucide-react';

export default function AdminSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">App configuration and preferences</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto">
          <Settings className="w-8 h-8 text-slate-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Coming Soon</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
            App-wide configuration options like matching rules, content policies, and feature flags will be available here.
          </p>
        </div>
      </div>
    </div>
  );
}
