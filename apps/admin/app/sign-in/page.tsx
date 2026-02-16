"use client";

import { Car, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    authClient.signIn
      .email({
        email,
        password,
        callbackURL: "/dashboard/operations",
        fetchOptions: {
          onResponse: () => {
            setLoading(false);
          },
          onRequest: () => {
            setLoading(true);
          },
          onError: (ctx) => {
            toast.error("Authentication Failed", {
              description:
                ctx.error.message || "Invalid administrator credentials.",
            });
          },
          onSuccess: () => {
            toast.success("Identity Verified", {
              description: "Access granted. Loading operational data...",
            });
            router.push("/dashboard/operations");
          },
        },
      })
      .catch(() => {
        toast.error("System Error", {
          description: "Could not connect to the authentication server.",
        });
        setLoading(false);
      });
  };

  return (
    <div className="relative flex h-screen w-full items-center justify-center px-4 overflow-hidden bg-background">
      {/* Subtle Developer Grid Background */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] [background-size:40px_40px]" />

      <div className="relative z-10 w-full max-w-sm space-y-6">
        {/* Brand Identity */}
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <Car className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Hitchly Admin</h1>
          <p className="text-sm text-muted-foreground uppercase tracking-widest font-semibold">
            Internal Access Only
          </p>
        </div>

        <Card className="shadow-xl border-muted/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center font-bold">
              Sign In
            </CardTitle>
            <CardDescription className="text-center">
              Authenticate with your McMaster admin account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@mcmaster.ca"
                    className="pl-9"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                    }}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="pl-9 pr-10"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                    }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowPassword(!showPassword);
                    }}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-10 font-bold"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
