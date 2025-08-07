"use client";

import { useEffect, useState } from "react";
import { startOfToday, endOfToday } from "date-fns";

interface Call {
    call_start_time: string | null;
}

interface TodaysCallsCountProps {
    calls: Call[];
}

export function TodaysCallsCount({ calls }: TodaysCallsCountProps) {
    const [count, setCount] = useState<number | null>(null);

    useEffect(() => {
        // Get start and end of today in user's timezone
        const todayStart = startOfToday();
        const todayEnd = endOfToday();

        // Filter calls for today
        const todaysCalls = calls.filter((call) => {
            if (!call.call_start_time) return false;
            const callTime = new Date(call.call_start_time);
            return callTime >= todayStart && callTime <= todayEnd;
        });

        setCount(todaysCalls.length);
    }, [calls]);

    if (count === null) {
        return <span className="animate-pulse">—</span>;
    }

    return <span>{count}</span>;
}
