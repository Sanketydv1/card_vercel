"use client";
import { useEffect } from "react";
import axiosInstance from "@/lib/axiosConfig";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
    const router = useRouter();

    useEffect(() => {
        const redirectByRole = async () => {
            try {
                const res = await axiosInstance.get("/api/auth/me");
                const role = res.data.data?.role ? String(res.data.data.role).toLowerCase() : null;
                if (["sale", "customer"].includes(role)) {
                    router.replace("/dashboard/sales/orders");
                } else if (role === "account") {
                    router.replace("/dashboard/accountant/pendingPos");
                } else if (role === "admin") {
                    // Admins manage users; send them to the Users list
                    router.replace("/dashboard/admin/orderList");
                } else if (role === "graphic") {
                    router.replace("/dashboard/graphic/pendingcdr");
                } else {
                    router.replace("/dashboard/sales/orders");
                }
            } catch (err) {
                router.replace("/");
            }
        };
        redirectByRole();
    }, []);

    return null;
}
