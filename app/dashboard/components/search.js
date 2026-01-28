"use client";
import React, { useEffect, useState } from "react";
import { Search as SearchIcon } from "lucide-react";

export const filterOrders = (orders, searchTerm) => {
    if (!searchTerm) return orders;
    const search = searchTerm.toLowerCase();
    return orders.filter(o => (
        (o.designName && o.designName.toLowerCase().includes(search)) ||
        (o.dataType && o.dataType.toLowerCase().includes(search)) ||
        (o.cardType && o.cardType.toLowerCase().includes(search)) ||
        (o.fullName && o.fullName.toLowerCase().includes(search)) ||
        (o.quantity && o.quantity.toString().includes(search)) ||
        (o.orderStatus && o.orderStatus.toLowerCase().includes(search)) ||
        (o.vendorName && o.vendorName.toLowerCase().includes(search)) ||
        (o.inputPrice && o.inputPrice.toString().includes(search)) ||
        (o.finishing && o.finishing.toLowerCase().includes(search))
    ));
};

export default function Search({ value = "", onChange = null, placeholder = "Search", className = "pl-8 pr-3 py-1.5 rounded-lg text-sm outline-none" }) {
    const [local, setLocal] = useState(value || "");

    useEffect(() => {
        setLocal(value || "");
    }, [value]);

    const handle = (e) => {
        const v = e.target.value;
        setLocal(v);
        if (typeof onChange === "function") onChange(v);
    };

    return (
        <div className="relative border border-white rounded-lg">
            <input value={local} onChange={handle} placeholder={placeholder} className={className} />
            <SearchIcon size={16} className="absolute left-2 top-2 text-white" />
        </div>
    );
}
