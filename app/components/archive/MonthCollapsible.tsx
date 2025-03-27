import * as Collapsible from "@radix-ui/react-collapsible";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Link } from "@radix-ui/themes";

interface MonthCollapsibleItem {
	id: string;
	pubDate: Date;
}

export interface MonthCollapsibleProps {
	month: string;
	year: number;
	items: MonthCollapsibleItem[];
	userId: string;
	index: number;
}

const MonthCollapsible = ({
	month,
	year,
	items,
	userId,
	index,
}: MonthCollapsibleProps) => {
	const [open, setOpen] = useState(index === 0);

	return (
		<Collapsible.Root open={open} onOpenChange={setOpen}>
			<Collapsible.Trigger asChild>
				<div
					style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
				>
					<h2>
						{month} {year}
					</h2>
					{open ? (
						<ChevronDown style={{ color: "var(--accent-11)" }} />
					) : (
						<ChevronRight style={{ color: "var(--accent-11)" }} />
					)}
				</div>
			</Collapsible.Trigger>
			<Collapsible.Content>
				<ul style={{ listStyle: "none", padding: 0 }}>
					{items.map((item) => (
						<li key={item.id}>
							<Link href={`/digest/${userId}/${item.id}`}>
								{new Date(item.pubDate).toLocaleDateString("en-US", {
									year: "numeric",
									month: "long",
									day: "numeric",
								})}
							</Link>
						</li>
					))}
				</ul>
			</Collapsible.Content>
		</Collapsible.Root>
	);
};

export default MonthCollapsible;
