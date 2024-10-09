import type { Password, User } from "@prisma/client";
import bcrypt from "bcryptjs";
import { uuidv7 } from "uuidv7-js";
import jwt from "jsonwebtoken";

import { prisma } from "../db.server";
export type { User } from "@prisma/client";

export async function getUserById(id: User["id"]) {
	return prisma.user.findUnique({
		where: { id },
	});
}

export async function getUserByEmail(email: User["email"]) {
	return prisma.user.findUnique({ where: { email } });
}

export async function createUser(email: User["email"], password: string) {
	const hashedPassword = await bcrypt.hash(password, 10);

	return await prisma.user.create({
		data: {
			id: uuidv7(),
			email,
			password: {
				create: {
					hash: hashedPassword,
				},
			},
		},
	});
}

export async function createEmailToken(user: User) {
	const token = jwt.sign(
		{ email: user.email, id: user.id },
		process.env.SECRET_KEY as string,
		{ expiresIn: "1h" },
	);
	return await prisma.emailToken.create({
		data: {
			userId: user.id,
			token,
		},
	});
}

export async function getEmailToken(token: string) {
	const tokenData = jwt.verify(token, process.env.SECRET_KEY as string);
	return tokenData;
}

export async function deleteUserByEmail(email: User["email"]) {
	return prisma.user.delete({ where: { email } });
}

export async function verifyLogin(
	email: User["email"],
	password: Password["hash"],
) {
	const userWithPassword = await prisma.user.findUnique({
		where: { email },
		include: {
			password: true,
		},
	});

	if (!userWithPassword || !userWithPassword.password) {
		return null;
	}

	const isValid = await bcrypt.compare(
		password,
		userWithPassword.password.hash,
	);

	if (!isValid) {
		return null;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { password: _password, ...userWithoutPassword } = userWithPassword;

	return userWithoutPassword;
}
