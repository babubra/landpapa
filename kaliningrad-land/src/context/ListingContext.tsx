"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface ListingContextType {
    selectedPlotId: number | null;
    setSelectedPlotId: (id: number | null) => void;
}

const ListingContext = createContext<ListingContextType | undefined>(undefined);

export function ListingProvider({ children }: { children: ReactNode }) {
    const [selectedPlotId, setSelectedPlotId] = useState<number | null>(null);

    return (
        <ListingContext.Provider value={{ selectedPlotId, setSelectedPlotId }}>
            {children}
        </ListingContext.Provider>
    );
}

export function useListingContext() {
    const context = useContext(ListingContext);
    if (context === undefined) {
        throw new Error("useListingContext must be used within a ListingProvider");
    }
    return context;
}
