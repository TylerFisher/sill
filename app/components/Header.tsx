import { Heading } from "@radix-ui/themes";
import { Link } from "@remix-run/react";

const Header = () => {
	return (
		<header>
			<Heading
				size="9"
				style={{
					fontWeight: 900,
					fontStyle: "italic",
					textAlign: "center",
					color: "var(--accent-11)",
					textTransform: "lowercase",
					paddingTop: "1rem",
				}}
				mb="4"
			>
				<Link
					to="/"
					style={{
						color: "inherit",
						textDecoration: "none",
					}}
				>
					Sill
				</Link>
			</Heading>
		</header>
	);
};

export default Header;
