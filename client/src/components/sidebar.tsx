import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Sprout, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: number;
  active?: boolean;
}

interface SidebarProps {
  title: string;
  subtitle: string;
  userName: string;
  items: SidebarItem[];
  onLogout: () => void;
  isLoggingOut?: boolean;
}

export default function Sidebar({
  title,
  subtitle,
  userName,
  items,
  onLogout,
  isLoggingOut = false,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          data-testid="button-mobile-menu"
        >
          {isCollapsed ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 z-40 h-full w-64 transform bg-card border-r border-border transition-transform duration-200 ease-in-out lg:translate-x-0",
          isCollapsed ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center border-b border-border px-6">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
                <Sprout className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-semibold text-foreground truncate">
                  {title}
                </h1>
                <p className="text-xs text-muted-foreground truncate">
                  {subtitle}
                </p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="px-6 py-4 border-b border-border">
            <div className="text-sm">
              <p className="text-muted-foreground">Welcome,</p>
              <p className="font-medium text-foreground truncate">{userName}</p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {items.map((item, index) => (
              <div key={item.id}>
                <Button
                  variant={item.active ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-10",
                    item.active && "bg-secondary text-secondary-foreground"
                  )}
                  onClick={item.onClick}
                  data-testid={`sidebar-${item.id}`}
                >
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </Button>
                {/* Add separator after certain items for better organization */}
                {(index === 0 || 
                  (items.length > 4 && index === Math.floor(items.length * 0.7))) && (
                  <Separator className="my-2" />
                )}
              </div>
            ))}
          </nav>

          {/* Logout Button */}
          <div className="border-t border-border p-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={onLogout}
              disabled={isLoggingOut}
              data-testid="sidebar-logout"
            >
              <LogOut className="h-4 w-4" />
              {isLoggingOut ? "Logging out..." : "Logout"}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isCollapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsCollapsed(false)}
        />
      )}
    </>
  );
}