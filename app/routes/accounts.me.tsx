import {
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { getActor } from "~/models/actor.server";
import { requireUser } from "~/session.server";

export const meta: MetaFunction = () => [{ title: "My account" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);
  if (!user.actor) return null;
  const actor = await getActor(user.actor.id);

  return json({
    actor,
  });
};

const Me = () => {
  const data = useLoaderData<typeof loader>();

  const nameDisplay = `${data?.actor.name} (@${data?.actor.handle})`;

  return (
    <>
      <h1>{nameDisplay}</h1>
      {data?.actor.posts.map((post) => (
        <section>
          <article>
            <header>
              <strong>{data?.actor.name}</strong>
              <br />
              <span>@{data.actor.handle}</span>
            </header>
            <div
              dangerouslySetInnerHTML={{
                __html: post.contentHtml || "",
              }}
            ></div>
            <footer>{post.updated}</footer>
          </article>
        </section>
      ))}
    </>
  );
};

export default Me;
