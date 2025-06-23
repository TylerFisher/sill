import { CustomerPortal } from "@polar-sh/remix";

export const loader = CustomerPortal({
	getCustomerId: (event) => {
		console.log(event);
	},
	server: "sandbox",
});
