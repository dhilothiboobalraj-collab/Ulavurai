import { useLocation, useNavigate } from "react-router-dom";
import { Leaf } from "lucide-react";
import InputForm from "../components/InputForm.jsx";

export default function Predict() {
  const navigate = useNavigate();
  const { state } = useLocation();
  return (
    <div className="page narrow-page">
      <header className="page-heading">
        <p className="eyebrow"><Leaf size={14} /> CROP ADVISOR</p>
        <h1>Let’s read the field.</h1>
        <p>Share the measurements you have. We’ll show how they compare with the training data.</p>
      </header>
      <InputForm
        initialFarmerGuideContext={state?.farmerGuideContext}
        onSuccess={(result) => navigate("/results", { state: { result } })}
      />
    </div>
  );
}
