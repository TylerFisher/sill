import { requireUserId } from "~/utils/auth.server";
import type { Route } from "./+types/checkout";
import { redirect } from "react-router";
import { db } from "~/drizzle/db.server";
import { polarProduct } from "~/drizzle/schema.server";
import { getCheckout, updateCustomerExternalId } from "~/utils/polar.server";
import Layout from "~/components/nav/Layout";
import { Box, DataList, Heading } from "@radix-ui/themes";
import PageHeading from "~/components/nav/PageHeading";
import { eq } from "drizzle-orm";

export const loader = async ({ request }: Route.LoaderArgs) => {
	const userId = await requireUserId(request);
	const checkoutId = new URL(request.url).searchParams.get("checkoutId");

	if (!checkoutId) {
		console.log("No checkout ID");
		return redirect("/settings/subscription") as never;
	}

	const checkout = await getCheckout(checkoutId);
	// TODO: handle checkout failures
	if (checkout.status !== "succeeded") {
		console.log("Checkout was not successful", checkout.status);
		return redirect("/settings/subscription") as never;
	}

	const product = await db.query.polarProduct.findFirst({
		where: eq(polarProduct.polarId, checkout.productId),
	});

	if (!product) {
		console.log("Could not find product", checkout.productId);
		return redirect("/settings/subscription") as never;
	}

	if (!checkout.customerId) {
		console.log("no customer ID");
		return redirect("/settings/subscription") as never;
	}

	await updateCustomerExternalId(checkout.customerId, userId);

	return { checkout, product };
};

const Checkout = ({ loaderData }: Route.ComponentProps) => {
	const { product } = loaderData;

	return (
		<Layout>
			<PageHeading
				title="Congratulations!"
				dek="Thank you for signing up for Sill+. Here's what you can expect."
			/>

			<Box>
				<Heading as="h3" size="4">
					Your subscription
				</Heading>
				<DataList.Item align="center">
					<DataList.Label>Plan</DataList.Label>
					<DataList.Value>{product.name}</DataList.Value>
				</DataList.Item>
			</Box>
		</Layout>
	);
};

export default Checkout;
