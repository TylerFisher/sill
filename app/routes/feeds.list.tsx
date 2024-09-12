import {
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { getItemsForUser } from "~/models/feed.server";
import { requireUser } from "~/session.server";

export const meta: MetaFunction = () => [{ title: "Feeds" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);
  const items = await getItemsForUser(user.id);

  return json({ items });
};

const FeedList = () => {
  const data = useLoaderData<typeof loader>();

  return (
    <>
      <h1>Feeds</h1>
      {data.items.map((item) => (
        <div key={item.id}>
          <div>
            <hgroup>
              <h5
                style={{
                  textTransform: "uppercase",
                  fontWeight: "normal",
                  fontSize: "14px",
                }}
              >
                <a
                  style={{
                    textDecoration: "none",
                  }}
                  href={item.feed.url}
                >
                  {item.feed.title}
                </a>
              </h5>
              <h3
                style={{
                  fontSize: "24px",
                }}
              >
                <a href={item.url}>{item.title}</a>
              </h3>
            </hgroup>
            <p>{item.description}</p>
          </div>
          {item.media.length > 0 && (
            <div>
              <img src={item.media[0].thumbnailUrl} />
            </div>
          )}
        </div>
      ))}
    </>
  );
};

export default FeedList;
