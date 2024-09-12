import {
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { getSubscriptionsForUser } from "~/models/feed.server";
import { requireUser } from "~/session.server";

export const meta: MetaFunction = () => [{ title: "Feeds" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);
  const subscriptions = await getSubscriptionsForUser(user.id);

  return json({ subscriptions });
};

const FeedList = () => {
  const data = useLoaderData<typeof loader>();

  return (
    <>
      <h1>Feeds</h1>
      {data.subscriptions.map((subscription) => (
        <>
          <h2>{subscription.feed.title}</h2>
          {subscription.feed.items.map((item) => (
            <>
              <a href={item.url}>
                <h3>{item.title}</h3>
              </a>
              <p>{item.description}</p>
            </>
          ))}
        </>
      ))}
    </>
  );
};

export default FeedList;
