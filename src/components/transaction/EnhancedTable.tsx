import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Column {
  key: string;
  header: string;
  width?: string;
  className?: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface Action {
  label: string;
  icon: React.ComponentType<any>;
  onClick: (row: any) => void;
  variant?: "default" | "destructive" | "outline";
  className?: string;
}

interface EnhancedTableProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<any>;
  data: any[];
  columns: Column[];
  actions?: Action[];
  loading?: boolean;
  emptyMessage?: string;
  headerColor?: string;
}

export const EnhancedTable = ({
  title,
  subtitle,
  icon: Icon,
  data,
  columns,
  actions = [],
  loading = false,
  emptyMessage = "Tidak ada data",
  headerColor = "bg-gradient-to-r from-primary/10 to-primary/5"
}: EnhancedTableProps) => {
  const isMobile = useIsMobile();

  const renderMobileCard = (row: any, index: number) => (
    <Card key={index} className="mb-4 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          {columns.slice(0, 4).map((column) => (
            <div key={column.key} className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">
                {column.header}:
              </span>
              <div className={cn("text-sm", column.className)}>
                {column.render ? column.render(row[column.key], row) : row[column.key]}
              </div>
            </div>
          ))}
          
          {actions.length > 0 && (
            <div className="flex gap-2 pt-2 border-t">
              {actions.slice(0, 2).map((action, actionIndex) => {
                const ActionIcon = action.icon;
                return (
                  <Button
                    key={actionIndex}
                    variant={action.variant || "outline"}
                    size="sm"
                    onClick={() => action.onClick(row)}
                    className={cn("flex-1", action.className)}
                  >
                    <ActionIcon className="w-4 h-4 mr-1" />
                    {action.label}
                  </Button>
                );
              })}
              
              {actions.length > 2 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {actions.slice(2).map((action, actionIndex) => {
                      const ActionIcon = action.icon;
                      return (
                        <DropdownMenuItem
                          key={actionIndex}
                          onClick={() => action.onClick(row)}
                          className={action.variant === "destructive" ? "text-destructive" : ""}
                        >
                          <ActionIcon className="w-4 h-4 mr-2" />
                          {action.label}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderDesktopActions = (row: any) => {
    if (actions.length === 0) return null;

    return (
      <div className="flex gap-1">
        {actions.slice(0, 3).map((action, actionIndex) => {
          const ActionIcon = action.icon;
          return (
            <Button
              key={actionIndex}
              variant={action.variant || "outline"}
              size="sm"
              onClick={() => action.onClick(row)}
              className={cn("h-8 w-8 p-0", action.className)}
              title={action.label}
            >
              <ActionIcon className="w-4 h-4" />
            </Button>
          );
        })}
        
        {actions.length > 3 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.slice(3).map((action, actionIndex) => {
                const ActionIcon = action.icon;
                return (
                  <DropdownMenuItem
                    key={actionIndex}
                    onClick={() => action.onClick(row)}
                    className={action.variant === "destructive" ? "text-destructive" : ""}
                  >
                    <ActionIcon className="w-4 h-4 mr-2" />
                    {action.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className={cn("rounded-t-lg", headerColor)}>
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-0 ring-1 ring-border/50">
      <CardHeader className={cn("rounded-t-lg border-b", headerColor)}>
        <CardTitle className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="w-5 h-5 text-primary" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            {subtitle && (
              <p className="text-sm text-muted-foreground font-normal">{subtitle}</p>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              {Icon && <Icon className="w-8 h-8 text-muted-foreground" />}
            </div>
            <p className="text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : isMobile ? (
          <div className="p-4">
            {data.map((row, index) => renderMobileCard(row, index))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/40">
                  {columns.map((column) => (
                    <TableHead 
                      key={column.key}
                      className={cn(column.width, column.className)}
                    >
                      {column.header}
                    </TableHead>
                  ))}
                  {(actions.length > 0 || data.some(row => row.actions)) && (
                    <TableHead className="w-32 text-center">Aksi</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, index) => (
                  <TableRow 
                    key={index}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    {columns.map((column) => (
                      <TableCell 
                        key={column.key}
                        className={cn(column.className)}
                      >
                        {column.render ? column.render(row[column.key], row) : row[column.key]}
                      </TableCell>
                    ))}
                    {(actions.length > 0 || row.actions) && (
                      <TableCell className="text-center">
                        {row.actions || renderDesktopActions(row)}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Helper components for common table cell types
export const StatusBadge = ({ 
  status, 
  variant = "secondary",
  className 
}: { 
  status: string;
  variant?: "default" | "destructive" | "outline" | "secondary";
  className?: string;
}) => (
  <Badge variant={variant} className={cn("capitalize", className)}>
    {status}
  </Badge>
);

export const CurrencyCell = ({ 
  amount, 
  className 
}: { 
  amount: number;
  className?: string;
}) => (
  <span className={cn("font-medium", className)}>
    {new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)}
  </span>
);

export const DateCell = ({ 
  date, 
  className,
  checkOverdue = false
}: { 
  date: string;
  className?: string;
  checkOverdue?: boolean;
}) => {
  const isOverdue = checkOverdue && new Date(date) < new Date();
  
  return (
    <span className={cn(
      "text-sm", 
      isOverdue && "text-red-600 font-medium",
      className
    )}>
      {new Date(date).toLocaleDateString('id-ID')}
    </span>
  );
};

export const AvatarCell = ({ 
  name, 
  subtitle, 
  className 
}: { 
  name: string;
  subtitle?: string;
  className?: string;
}) => (
  <div className={cn("flex items-center gap-3", className)}>
    <Avatar className="w-8 h-8">
      <AvatarFallback className="text-xs">
        {name.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
    <div>
      <div className="font-medium text-sm">{name}</div>
      {subtitle && (
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      )}
    </div>
  </div>
);

export const TextCell = ({ 
  text, 
  className 
}: { 
  text: string;
  className?: string;
}) => (
  <span className={cn("text-sm", className)}>
    {text}
  </span>
);

export const ActionCell = ({ 
  children, 
  className 
}: { 
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("flex items-center gap-2", className)}>
    {children}
  </div>
);