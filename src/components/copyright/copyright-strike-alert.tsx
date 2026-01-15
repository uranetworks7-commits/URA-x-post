
'use client';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TriangleAlert } from "lucide-react";
import { CopyrightStrike } from "@/lib/types";

interface CopyrightStrikeAlertProps {
    strikes: CopyrightStrike[];
}

export function CopyrightStrikeAlert({ strikes }: CopyrightStrikeAlertProps) {
    const strikeCount = strikes.length;

    if (strikeCount === 0) return null;

    let title = `You have ${strikeCount} active copyright strike${strikeCount > 1 ? 's' : ''}.`;
    let description = `Another strike will result in further penalties. Strikes expire 48 hours after being issued. Be careful.`;

    if (strikeCount >= 3) {
        title = "You have 3 active copyright strikes.";
        description = "Your account will be terminated soon due to multiple copyright violations. These strikes will not expire.";
    }

    return (
        <Alert variant="destructive">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription>
                {description}
            </AlertDescription>
        </Alert>
    );
}
