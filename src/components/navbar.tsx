"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Home, LogOut, Plus, BookOpen, View } from "lucide-react";
import { useEffect, useState } from "react";

export function Navbar() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<{ email?: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, [supabase.auth]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Home className="h-5 w-5" />
          <span className="text-lg font-bold">Asuntoräätäli</span>
        </Link>

        {user && (
          <div className="flex items-center gap-4">
            <Link href="/materials">
              <Button variant="ghost" size="sm">
                <BookOpen className="mr-2 h-4 w-4" />
                Materiaalit
              </Button>
            </Link>
            <Link href="/tours">
              <Button variant="ghost" size="sm">
                <View className="mr-2 h-4 w-4" />
                Kierrokset
              </Button>
            </Link>
            <Link href="/projects/new">
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Uusi projekti
              </Button>
            </Link>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
