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

interface UserRole {
  user_id: string;
  role_id: number;
  created_at: string;
  profiles?: {
    username: string | null;
    full_name: string | null;
    employees?: {
      first_name: string;
      last_name: string;
    } | null;
  } | null;
  roles: {
    role_name: string;
  };
}

interface Profile {
  id: string;
  username: string;
  full_name: string;
  employees?: {
    first_name: string;
    last_name: string;
  };
}

interface Role {
  role_id: number;
  role_name: string;
}

const UserRolesPage = () => {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [filteredUserRoles, setFilteredUserRoles] = useState<UserRole[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    user_id: "",
    role_id: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchUserRoles();
    fetchProfiles();
    fetchRoles();
  }, []);

  useEffect(() => {
    filterUserRoles();
  }, [userRoles, searchTerm]);

  const fetchUserRoles = async () => {
    try {
      // Fetch user roles data only
      const { data: userRolesData, error: userRolesError } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });

      if (userRolesError) throw userRolesError;

      if (!userRolesData || userRolesData.length === 0) {
        setUserRoles([]);
        return;
      }

      // Fetch profiles separately and match manually
      const userIds = userRolesData.map(ur => ur.user_id);
      const roleIds = userRolesData.map(ur => ur.role_id);
      
      const [profilesResult, rolesResult] = await Promise.all([
        supabase
          .from("profiles")
          .select(`
            id,
            username,
            full_name,
            employees (
              first_name,
              last_name
            )
          `)
          .in("id", userIds),
        supabase
          .from("roles")
          .select("role_id, role_name")
          .in("role_id", roleIds)
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (rolesResult.error) throw rolesResult.error;

      // Combine the data manually
      const combinedData = userRolesData.map(ur => ({
        ...ur,
        profiles: profilesResult.data?.find(p => p.id === ur.user_id) || null,
        roles: rolesResult.data?.find(r => r.role_id === ur.role_id) || { role_name: 'Unknown' }
      }));

      setUserRoles(combinedData);
    } catch (error) {
      console.error("Error fetching user roles:", error);
      toast({
        title: "Error",
        description: "Failed to fetch user roles",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          username,
          full_name,
          employees (
            first_name,
            last_name
          )
        `)
        .eq("is_approved", true)
        .order("username");

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error("Failed to fetch profiles:", error);
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

  const filterUserRoles = () => {
    const filtered = userRoles.filter(
      (ur) =>
        (ur.profiles && ur.profiles.username?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ur.profiles && ur.profiles.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ur.profiles?.employees && 
          (ur.profiles.employees.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           ur.profiles.employees.last_name.toLowerCase().includes(searchTerm.toLowerCase()))) ||
        (ur.roles && ur.roles.role_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredUserRoles(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from("user_roles")
        .insert([{
          user_id: formData.user_id,
          role_id: parseInt(formData.role_id),
        }]);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Role assigned to user successfully",
      });
      
      fetchUserRoles();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign role to user",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (userId: string, roleId: number) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role_id", roleId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Role removed from user successfully",
      });
      
      fetchUserRoles();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove role from user",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      user_id: "",
      role_id: "",
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
        <h1 className="text-2xl font-bold">User Roles</h1>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Assign Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Role to User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="user_id">User</Label>
                <Select value={formData.user_id} onValueChange={(value) => setFormData({ ...formData, user_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih User" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.username || profile.full_name} {profile.employees && `(${profile.employees.first_name} ${profile.employees.last_name})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            placeholder="Search user roles..."
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
              <TableHead>Username</TableHead>
              <TableHead>Nama Pegawai</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Tanggal Assigned</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUserRoles.map((ur) => (
              <TableRow key={`${ur.user_id}-${ur.role_id}`}>
                <TableCell>{ur.profiles?.username || ur.profiles?.full_name || '-'}</TableCell>
                <TableCell>
                  {ur.profiles?.employees ? 
                    `${ur.profiles.employees.first_name} ${ur.profiles.employees.last_name}` : 
                    ur.profiles?.full_name || '-'
                  }
                </TableCell>
                <TableCell>{ur.roles?.role_name || '-'}</TableCell>
                <TableCell>{new Date(ur.created_at).toLocaleDateString('id-ID')}</TableCell>
                <TableCell className="text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Role</AlertDialogTitle>
                        <AlertDialogDescription>
                          Apakah Anda yakin ingin menghapus role {ur.roles?.role_name} dari user {ur.profiles?.username || ur.profiles?.full_name}?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(ur.user_id, ur.role_id)}
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

      {filteredUserRoles.length === 0 && (
        <div className="text-center text-muted-foreground mt-6">
          No user roles found.
        </div>
      )}
    </div>
  );
};

export default UserRolesPage;