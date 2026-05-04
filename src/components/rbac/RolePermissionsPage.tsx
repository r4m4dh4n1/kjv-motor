import { useState, useEffect } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface RolePermission {
  role_id: number;
  permission_id: number;
  created_at: string;
  roles?: {
    role_name: string;
  };
  permissions?: {
    permission_name: string;
  };
}

interface Role {
  role_id: number;
  role_name: string;
}

interface Permission {
  permission_id: number;
  permission_name: string;
}

const RolePermissionsPage = () => {
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [filteredRolePermissions, setFilteredRolePermissions] = useState<RolePermission[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    role_id: "",
    permission_id: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchRolePermissions();
    fetchRoles();
    fetchPermissions();
  }, []);

  useEffect(() => {
    filterRolePermissions();
  }, [rolePermissions, searchTerm]);

  const fetchRolePermissions = async () => {
    try {
      const { data, error } = await supabase
        .from("role_permissions")
        .select(`
          *,
          roles (
            role_name
          ),
          permissions (
            permission_name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRolePermissions(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch role permissions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from("roles")
        .select("role_id, role_name")
        .order("role_name");

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error("Failed to fetch roles:", error);
    }
  };

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from("permissions")
        .select("permission_id, permission_name")
        .order("permission_name");

      if (error) throw error;
      setPermissions(data || []);
    } catch (error) {
      console.error("Failed to fetch permissions:", error);
    }
  };

  const filterRolePermissions = () => {
    const filtered = rolePermissions.filter(
      (rp) =>
        (rp.roles && rp.roles.role_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (rp.permissions && rp.permissions.permission_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredRolePermissions(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from("role_permissions")
        .insert([{
          role_id: parseInt(formData.role_id),
          permission_id: parseInt(formData.permission_id),
        }]);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Role permission assigned successfully",
      });
      
      fetchRolePermissions();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign role permission",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (roleId: number, permissionId: number) => {
    try {
      const { error } = await supabase
        .from("role_permissions")
        .delete()
        .eq("role_id", roleId)
        .eq("permission_id", permissionId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Role permission removed successfully",
      });
      
      fetchRolePermissions();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove role permission",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      role_id: "",
      permission_id: "",
    });
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Role Permissions</h1>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Assign Permission
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Permission to Role</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="role_id">Role</Label>
                <Select value={formData.role_id} onValueChange={(value) => setFormData({ ...formData, role_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.role_id} value={role.role_id.toString()}>
                        {role.role_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="permission_id">Permission</Label>
                <Select value={formData.permission_id} onValueChange={(value) => setFormData({ ...formData, permission_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Permission" />
                  </SelectTrigger>
                  <SelectContent>
                    {permissions.map((permission) => (
                      <SelectItem key={permission.permission_id} value={permission.permission_id.toString()}>
                        {permission.permission_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit">
                  Assign
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search role permissions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Permission</TableHead>
              <TableHead>Tanggal Assigned</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRolePermissions.map((rp) => (
              <TableRow key={`${rp.role_id}-${rp.permission_id}`}>
                <TableCell>{rp.roles?.role_name || '-'}</TableCell>
                <TableCell>{rp.permissions?.permission_name || '-'}</TableCell>
                <TableCell>{new Date(rp.created_at).toLocaleDateString('id-ID')}</TableCell>
                <TableCell className="text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Permission</AlertDialogTitle>
                        <AlertDialogDescription>
                          Apakah Anda yakin ingin menghapus permission {rp.permissions?.permission_name} dari role {rp.roles?.role_name}?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(rp.role_id, rp.permission_id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredRolePermissions.length === 0 && (
        <div className="text-center text-muted-foreground mt-6">
          No role permissions found.
        </div>
      )}
    </div>
  );
};

export default RolePermissionsPage;