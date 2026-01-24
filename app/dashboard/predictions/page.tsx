"use client";

import { PricePrediction } from "@/components/dashboard/PricePrediction";
import PremiumGate from "@/components/ui/PremiumGate";

export default function PredictionsPage() {
  return (
    <div>
      <PremiumGate 
        feature="aiPredictions" 
        minHeight="400px"
        fallback={<PricePrediction />}
      >
        <PricePrediction />
      </PremiumGate>
    </div>
  );
}
