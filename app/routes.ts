import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/api/science/new_experiment", "routes/new_fingerprint.tsx"),
  route("/plan/:encodedParams/:planId", "routes/plan.tsx"),
] satisfies RouteConfig;
