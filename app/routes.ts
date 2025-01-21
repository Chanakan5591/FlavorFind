import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/api/science/new_experiment", "routes/new_fingerprint.tsx"),
  route("/api/neueplan", "routes/new_plan.tsx"),
] satisfies RouteConfig;
