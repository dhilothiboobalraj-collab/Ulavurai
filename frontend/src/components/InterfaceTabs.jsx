import { Link, useLocation } from "react-router-dom";
import { BookOpenCheck, Sprout } from "lucide-react";

export default function InterfaceTabs() {
  const location = useLocation();
  const farmerActive = location.pathname.startsWith("/farmer");
  return (
    <nav className="interface-tabs" aria-label="Choose your SeasonSense experience">
      <Link to="/predict" aria-current={!farmerActive ? "page" : undefined} className={`interface-tab${!farmerActive ? " active" : ""}`}>
        <BookOpenCheck size={19} />
        <span><strong>Expert Advisor</strong><small>நிபுணர் ஆலோசனை</small></span>
      </Link>
      <Link to="/farmer" aria-current={farmerActive ? "page" : undefined} className={`interface-tab${farmerActive ? " active" : ""}`}>
        <Sprout size={19} />
        <span><strong>Easy Farmer Guide</strong><small>எளிய விவசாயி வழிகாட்டி</small></span>
      </Link>
    </nav>
  );
}
