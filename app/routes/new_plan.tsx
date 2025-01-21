import type { Route } from "./+types/new_plan";

export async function action({ request }: Route.ActionArgs) {
  let formData = await request.formData();
  const planningInformation = JSON.stringify(
    Object.fromEntries(formData.entries()),
  );
  console.log(planningInformation);
  let meals = [];
}

// return page that will redirect to /
export default function NewPlan() {
  return (
    <html>
      <head>
        <meta httpEquiv="refresh" content="0;url=/" />
      </head>
    </html>
  );
}
