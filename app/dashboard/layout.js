"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/lib/axiosConfig";
import { useRouter, usePathname } from "next/navigation";
import toast from "react-hot-toast";
import {
    CreditCard, Clock, FileImage, CheckCircle, FileText, ClipboardList,
    Building2, Settings, Package, UserCheck, Menu, ChevronRight
} from 'lucide-react';

export default function DashboardLayout({ children }) {
    const [user, setUser] = useState(null);
    const router = useRouter();
    const pathname = usePathname(); // ✅ FIXED (reactive)

    const [collapsed, setCollapsed] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);



    useEffect(() => {
        const getMe = async () => {
            try {
                const res = await axiosInstance.get("/api/auth/me");
                setUser(res.data.data);
            } catch (err) {
                router.push("/");
            }
        };
        getMe();
    }, []);

    useEffect(() => {
        const closeOnOutsideClick = (e) => {
            if (!e.target.closest(".profile-menu")) {
                setShowProfileMenu(false);
            }
        };

        document.addEventListener("click", closeOnOutsideClick);
        return () => document.removeEventListener("click", closeOnOutsideClick);
    }, []);


    const handleLogout = async () => {
        try {
            await axiosInstance.post("/api/auth/logout");
            toast.success("Logged out");
            router.push("/");
        } catch (err) {
            toast.error("Logout failed");
        }
    };

    const initials = (name) => {
        if (!name) return "U";
        return name
            .split(" ")
            .map((s) => s[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
    };

    /* ---------------- ROLE LOGIC ---------------- */
    const role = user?.role?.toLowerCase() || "";
    const isAdmin = role === "admin";

    // Admin should only see the Users section in the sidebar (no sales/graphic)
    const showCardOrder = ["sale", "customer"].includes(role);
    const showAccountant = role === "account";
    const showGraphic = role === "graphic";

    const goTo = (path) => router.push(path);

    const isActive = (path) => pathname === path;
    const isStartsWith = (path) => pathname.startsWith(path);

    return (
        <div className="min-h-screen bg-[var(--main-gradient)] flex">
            {/* ================= SIDEBAR ================= */}
            <aside
                className={`${collapsed ? "w-20 p-4" : "w-72 p-6"
                    } bg-white shadow flex flex-col justify-between transition-all duration-300`}
            >

                <div>
                    {/* -------- User Info -------- */}
                    <div className="relative mb-6 profile-menu">
                        {/* PROFILE CLICK AREA */}
                        <div
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className="flex items-center gap-3 cursor-pointer rounded-lg hover:bg-gray-100"
                        >
                            <div className="w-12 h-12 rounded-full button-gradient flex items-center justify-center text-lg font-semibold text-indigo-800">
                                {user ? initials(user.name || user.username || user.email) : "U"}
                            </div>

                            {!collapsed && (
                                <div className="leading-tight">
                                    <div className="text-sm font-semibold">
                                        {user?.name || user?.username || "User"}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {user?.role || "role"}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* POPOVER */}
                        {!collapsed && showProfileMenu && (
                            <div className="absolute left-0 top-full mt-2 w-56 bg-white shadow-xl rounded-xl border z-50">
                                <button
                                    onClick={() => {
                                        setShowProfileMenu(false);
                                        router.push("/dashboard/change-password");
                                    }}
                                    className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100"
                                >
                                    🔑 Change Password
                                </button>

                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-b-xl"
                                >
                                    🚪 Logout
                                </button>
                            </div>
                        )}
                    </div>


                    {/* -------- Navigation -------- */}
                    <nav className="space-y-2">
                        {showCardOrder && (
                            <div className="pt-4">
                                {!collapsed && (
                                    <div className="text-xs font-semibold text-gray-500 mb-2 uppercase">
                                        Sales exicutive
                                    </div>
                                )}
                                <button
                                    onClick={() => goTo("/dashboard/sales/orders")}
                                    className={`w-full text-left px-3 py-2 rounded transition
                                  ${isActive("/dashboard/sales/orders")
                                            ? "button-gradient text-white"
                                            : "text-gray-700 hover:bg-gray-100"
                                        }`}
                                >
                                    <CreditCard size={16} className="inline mr-2" /> {!collapsed && "Card Order"}
                                </button>

                                <button
                                    onClick={() => goTo("/dashboard/sales/approvals")}
                                    className={`w-full text-left px-3 py-2 rounded transition
                                  ${isActive("/dashboard/sales/approvals")
                                            ? "button-gradient text-white"
                                            : "text-gray-700 hover:bg-gray-100"
                                        }`}
                                >
                                    <Clock size={16} className="inline mr-2" /> {!collapsed && "Approval Pending"}
                                </button>
                            </div>
                        )}

                        {/* -------- Graphic Designer Section -------- */}
                        {showGraphic && (
                            <div className="pt-4">
                                {!collapsed && (
                                    <div className="text-xs font-semibold text-gray-500 mb-2 uppercase">
                                        Graphic Designer
                                    </div>
                                )}

                                <button
                                    onClick={() => goTo("/dashboard/graphic/pendingcdr")}
                                    className={`w-full text-left px-3 py-2 rounded transition
                                      ${isActive("/dashboard/graphic/pendingcdr")
                                            ? "button-gradient text-white"
                                            : "text-gray-700 hover:bg-gray-100"
                                        }`}
                                >
                                    <FileImage size={16} className="inline mr-2" /> {!collapsed && "CDR Pending List"}
                                </button>

                                <button
                                    onClick={() => goTo("/dashboard/graphic/submittedcdr")}
                                    className={`w-full text-left px-3 py-2 rounded transition
                                      ${isActive("/dashboard/graphic/submittedcdr")
                                            ? "button-gradient text-white"
                                            : "text-gray-700 hover:bg-gray-100"
                                        }`}
                                >
                                    <CheckCircle size={16} className="inline mr-2" /> {!collapsed && "Submitted CDR"}
                                </button>
                            </div>
                        )}
                        {/* -------- Accountant Section -------- */}
                        {showAccountant && (
                            <div className="pt-4">
                                {!collapsed && (
                                    <div className="text-xs font-semibold text-gray-500 mb-2 uppercase">
                                        Accountant
                                    </div>
                                )}

                                <button
                                    onClick={() => goTo("/dashboard/accountant/pendingPos")}
                                    className={`w-full text-left px-3 py-2 rounded transition
                                      ${isActive("/dashboard/accountant/pendingPos")
                                            ? "button-gradient text-white"
                                            : "text-gray-700 hover:bg-gray-100"
                                        }`}
                                >
                                    <FileText size={16} className="inline mr-2" /> {!collapsed && "PO Pending List"}
                                </button>

                                <button
                                    onClick={() => goTo("/dashboard/accountant/submittedPos")}
                                    className={`w-full text-left px-3 py-2 rounded transition
                                      ${isActive("/dashboard/accountant/submittedPos")
                                            ? "button-gradient text-white"
                                            : "text-gray-700 hover:bg-gray-100"
                                        }`}
                                >
                                    <CheckCircle size={16} className="inline mr-2" /> {!collapsed && "Submitted PO"}
                                </button>
                            </div>
                        )}

                        {isAdmin && (
                            <div className="pt-4">
                                {!collapsed && (
                                    <div className="text-xs font-semibold text-gray-500 mb-2 uppercase">
                                        Admin
                                    </div>
                                )}

                                <button
                                    onClick={() => goTo("/dashboard/admin/orderList")}
                                    className={`w-full text-left px-3 py-2 rounded mt-2 transition
                                      ${isStartsWith("/dashboard/admin/orderList")
                                            ? "button-gradient text-white"
                                            : "text-gray-700 hover:bg-gray-100"
                                        }`}
                                >
                                    <ClipboardList size={16} className="inline mr-2" /> {!collapsed && "Orders List"}
                                </button>

                                <button
                                    onClick={() => goTo("/dashboard/admin/vendorList")}
                                    className={`w-full text-left px-3 py-2 rounded mt-2 transition
                                      ${isStartsWith("/dashboard/admin/vendorList")
                                            ? "button-gradient text-white"
                                            : "text-gray-700 hover:bg-gray-100"
                                        }`}
                                >
                                    <Building2 size={16} className="inline mr-2" /> {!collapsed && "Vendors"}
                                </button>
                                <button
                                    onClick={() => goTo("/dashboard/admin/adminOrders")}
                                    className={`w-full text-left px-3 py-2 rounded mt-2 transition
                                      ${isStartsWith("/dashboard/admin/adminOrders")
                                            ? "button-gradient text-white"
                                            : "text-gray-700 hover:bg-gray-100"
                                        }`}
                                >
                                    <Settings size={16} className="inline mr-2" /> {!collapsed && "Admin Orders"}
                                </button>
                                <button
                                    onClick={() => goTo("/dashboard/admin/pendingApprovals")}
                                    className={`w-full text-left px-3 py-2 rounded mt-2 transition
                                      ${isStartsWith("/dashboard/admin/pendingApprovals")
                                            ? "button-gradient text-white"
                                            : "text-gray-700 hover:bg-gray-100"
                                        }`}
                                >
                                    <Clock size={16} className="inline mr-2" /> {!collapsed && "Approval Pending"}
                                </button>

                                <button
                                    onClick={() => goTo("/dashboard/admin/cardDelivered")}
                                    className={`w-full text-left px-3 py-2 rounded mt-2 transition
                                      ${isStartsWith("/dashboard/admin/cardDelivered")
                                            ? "button-gradient text-white"
                                            : "text-gray-700 hover:bg-gray-100"
                                        }`}
                                >
                                    <Package size={16} className="inline mr-2" /> {!collapsed && "Card Delivered"}
                                </button>

                                <button
                                    onClick={() => goTo("/dashboard/admin/users")}
                                    className={`w-full text-left px-3 py-2 rounded transition
                                      ${isStartsWith("/dashboard/admin/users")
                                            ? "button-gradient text-white"
                                            : "text-gray-700 hover:bg-gray-100"
                                        }`}
                                >
                                    <UserCheck size={16} className="inline mr-2" /> {!collapsed && "Users"}
                                </button>
                            </div>
                        )}
                    </nav>
                </div>

                {/* -------- Logout -------- */}
                {/* <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 text-gray-700 font-semibold hover:text-red-600 transition"
                >
                    Logout
                </button> */}
            </aside>

            {/* ================= MAIN CONTENT ================= */}
            <main className="flex-1 py-2 px-8 relative transition-all duration-300">
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="text-white rounded transition"
                >
                    {collapsed ? <ChevronRight size={22} /> : <Menu size={22} />}
                </button>

                {children}
            </main>

        </div>
    );
}
