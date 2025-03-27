import { redirect } from "react-router";

export const loader = async () => {
	return redirect("/digest/settings");
};
