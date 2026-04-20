import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Lock, Loader2, User, Mail, Phone, Building2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function AdminProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [organization, setOrganization] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Load profile on mount
  useState(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name || "");
          setPhone(data.phone || "");
          setOrganization(data.organization || "");
        }
        setLoadingProfile(false);
      });
  });

  const handleSaveProfile = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName || null,
        phone: phone || null,
        organization: organization || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) toast.error(error.message);
    else toast.success("Profile updated!");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="p-2 rounded-lg hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-2xl font-extrabold">My Profile</h1>
      </div>

      {/* Profile Info */}
      <div className="bg-card rounded-xl border p-5 space-y-4">
        <h2 className="font-bold text-sm flex items-center gap-2">
          <User className="h-4 w-4 text-primary" /> Profile Information
        </h2>
        <div>
          <Label className="text-xs text-muted-foreground">Email</Label>
          <div className="flex items-center gap-2 mt-1 px-3 py-2 bg-muted/50 rounded-xl text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            {user?.email}
          </div>
        </div>
        <div>
          <Label htmlFor="fullName" className="text-xs text-muted-foreground">Full Name</Label>
          <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" className="rounded-xl mt-1" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone" className="text-xs text-muted-foreground">Phone</Label>
            <div className="relative mt-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0123 456 789" className="pl-10 rounded-xl" />
            </div>
          </div>
          <div>
            <Label htmlFor="org" className="text-xs text-muted-foreground">Organization</Label>
            <div className="relative mt-1">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="org" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="School / Company" className="pl-10 rounded-xl" />
            </div>
          </div>
        </div>
        <Button onClick={handleSaveProfile} className="rounded-xl">Save Profile</Button>
      </div>

      {/* Change Password */}
      <div className="bg-card rounded-xl border p-5 space-y-4">
        <h2 className="font-bold text-sm flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" /> Change Password
        </h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <Label htmlFor="newPw" className="text-xs text-muted-foreground">New Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="newPw"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-10 rounded-xl"
                required
                minLength={6}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="confirmPw" className="text-xs text-muted-foreground">Confirm New Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPw"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 rounded-xl"
                required
                minLength={6}
              />
            </div>
          </div>
          <Button type="submit" variant="outline" className="rounded-xl" disabled={changingPassword}>
            {changingPassword && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Change Password
          </Button>
        </form>
      </div>
    </div>
  );
}
