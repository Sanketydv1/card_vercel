"use client";
import React from "react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";

export default function Pagination({ currentPage = 1, totalPages = 1, onPageChange = () => { } }) {
    currentPage = Number(currentPage) || 1;
    totalPages = Math.max(1, Number(totalPages) || 1);

    const goto = (p) => {
        if (p < 1) p = 1;
        if (p > totalPages) p = totalPages;
        if (p === currentPage) return;
        onPageChange(p);
    };

    // Build a compact pages array (show first, last, neighbors)
    const pages = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        const left = Math.max(2, currentPage - 1);
        const right = Math.min(totalPages - 1, currentPage + 1);
        if (left > 2) pages.push("left-ellipsis");
        for (let i = left; i <= right; i++) pages.push(i);
        if (right < totalPages - 1) pages.push("right-ellipsis");
        pages.push(totalPages);
    }

    return (
        <nav className="flex items-center gap-2" aria-label="Pagination">
            <button
                onClick={() => goto(currentPage - 1)}
                disabled={currentPage <= 1}
                className={`px-3 py-1 rounded-lg border text-sm ${currentPage <= 1 ? "bg-white text-gray-400" : "bg-white hover:bg-gray-100"}`}
            >
                <ChevronsLeft size={16} />
            </button>

            {pages.map((p, idx) => {
                if (p === "left-ellipsis" || p === "right-ellipsis") {
                    return (
                        <span key={"e-" + idx} className="px-3 py-1 text-sm text-gray-600">...</span>
                    );
                }
                return (
                    <button
                        key={p}
                        onClick={() => goto(p)}
                        className={`px-3 py-1 rounded-lg border text-sm ${p === currentPage ? "button-gradient-reverse" : "bg-white hover:bg-gray-100"}`}
                    >
                        {p}
                    </button>
                );
            })}

            <button
                onClick={() => goto(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className={`px-3 py-1 rounded-lg border text-sm ${currentPage >= totalPages ? "bg-white text-gray-400" : "bg-white hover:bg-gray-100"}`}
            >
                <ChevronsRight size={16} />
            </button>
        </nav>
    );
}
