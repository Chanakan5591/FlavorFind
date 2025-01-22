import type { Route } from "./+types/new_plan";
import { useParams } from "react-router";

// return page that will redirect to /
export default function NewPlan() {
  const { encodedParams, planId } = useParams();
  return <span>hi</span>;
}
