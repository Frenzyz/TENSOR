'use client';
import { uiComponentSchema, logicSchema } from '@/lib/dashboard-schema';

interface DashboardRendererProps {
  config: z.infer<typeof dashboardSchema>;
  className?: string;
}

export default function DashboardRenderer({ config, className }: DashboardRendererProps) {
  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {config.ui.map((component, index) => (
          <div key={index} className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">{component.title}</h3>
            <div className="text-muted-foreground text-sm">
              {component.type === 'chart' && (
                <div className="h-32 bg-muted/50 rounded flex items-center justify-center">
                  Chart Preview ({component.config?.chartType || 'bar'})
                </div>
              )}
              {component.type === 'table' && (
                <div className="space-y-1">
                  <div className="flex justify-between font-medium">
                    <span>Header 1</span>
                    <span>Header 2</span>
                  </div>
                  <div className="border-t" />
                  <div className="flex justify-between">
                    <span>Sample Data</span>
                    <span>1234</span>
                  </div>
                </div>
              )}
              {component.type === 'metric' && (
                <div className="text-2xl font-bold">$1,234.56</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
