import { Card, DataList } from "@radix-ui/themes";

interface SubscriptionDetailsCardProps {
	subscription: {
		cancelAtPeriodEnd: boolean;
		status: string;
		polarProduct: {
			name: string;
			amount: number;
			interval: string;
		};
		periodStart?: Date | null;
		periodEnd?: Date | null;
	};
}

export default function SubscriptionDetailsCard({
	subscription: sub,
}: SubscriptionDetailsCardProps) {
	return (
		<Card mt="4" mb="6">
			<DataList.Root>
				<DataList.Item align="center">
					<DataList.Label>Subscription status</DataList.Label>
					<DataList.Value>
						{sub.cancelAtPeriodEnd
							? "Cancelled"
							: `${sub.status[0].toLocaleUpperCase()}${sub.status.slice(1)}`}
					</DataList.Value>
				</DataList.Item>
				<DataList.Item align="center">
					<DataList.Label>Plan</DataList.Label>
					<DataList.Value>{sub.polarProduct.name}</DataList.Value>
				</DataList.Item>
				<DataList.Item align="center">
					<DataList.Label>Price</DataList.Label>
					<DataList.Value>
						${sub.polarProduct.amount / 100}/{sub.polarProduct.interval}
					</DataList.Value>
				</DataList.Item>
				<DataList.Item align="center">
					<DataList.Label>Subscription started</DataList.Label>
					<DataList.Value>
						{sub.periodStart?.toLocaleDateString()}
					</DataList.Value>
				</DataList.Item>
				<DataList.Item align="center">
					<DataList.Label>
						{sub.cancelAtPeriodEnd
							? "Subscription ends"
							: "Next billing date"}
					</DataList.Label>
					<DataList.Value>
						{sub.periodEnd?.toLocaleDateString()}
					</DataList.Value>
				</DataList.Item>
			</DataList.Root>
		</Card>
	);
}