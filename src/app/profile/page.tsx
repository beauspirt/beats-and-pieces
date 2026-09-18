"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { producerService } from "@/services";

function ProfileRedirect() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        const fresh = producerService.getProducerById(user.id) || user;
        router.replace(`/${fresh.handle || fresh.id}`);
      } else {
        router.replace("/signin");
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#7B61FF] border-t-transparent animate-spin" />
    </div>
  );
}

export default function UserProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#7B61FF] border-t-transparent animate-spin" />
        </div>
      }
    >
      <ProfileRedirect />
    </Suspense>
  );
}
