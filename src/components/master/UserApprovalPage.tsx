import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { UserCheck, UserX, Clock, Mail, User } from 'lucide-react';

interface PendingUser {
  id: string;
  username: string | null;
  full_name: string | null;
  employee_id: number | null;
  is_approved: boolean;
  created_at: string;
}

const UserApprovalPage = () => {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPendingUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch pending users.",
          variant: "destructive",
        });
      } else {
        setPendingUsers(data || []);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalChange = async (userId: string, approve: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: approve })
        .eq('id', userId);

      if (error) {
        toast({
          title: "Error",
          description: `Failed to ${approve ? 'approve' : 'reject'} user.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `User ${approve ? 'approved' : 'rejected'} successfully.`,
        });
        
        // Assign default user role when approving
        if (approve) {
          const { data: roles } = await supabase
            .from('roles')
            .select('role_id')
            .eq('role_name', 'user')
            .single();
            
          if (roles) {
            await supabase
              .from('user_roles')
              .insert({
                user_id: userId,
                role_id: roles.role_id
              });
          }
        }
        
        fetchPendingUsers();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            User Approval Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Button onClick={fetchPendingUsers} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registration Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {user.username || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {user.full_name || '-'}
                    </div>
                  </TableCell>
                  <TableCell>{user.username || '-'}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={user.is_approved ? "default" : "secondary"}
                      className="flex items-center gap-1 w-fit"
                    >
                      {user.is_approved ? (
                        <>
                          <UserCheck className="w-3 h-3" />
                          Approved
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" />
                          Pending
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {!user.is_approved ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApprovalChange(user.id, true)}
                            className="flex items-center gap-1"
                          >
                            <UserCheck className="w-3 h-3" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleApprovalChange(user.id, false)}
                            className="flex items-center gap-1"
                          >
                            <UserX className="w-3 h-3" />
                            Reject
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApprovalChange(user.id, false)}
                          className="flex items-center gap-1"
                        >
                          <UserX className="w-3 h-3" />
                          Revoke
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {pendingUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserApprovalPage;