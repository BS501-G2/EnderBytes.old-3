import type { UserResource } from "@rizzzi/enderdrive-lib/server";

export enum UserClass {
	Link
}

export type UserProps = (
	| {
			user: UserResource;
	  }
	| {
			userId: number;
	  }
) &
	(
		| {
				class: UserClass.Link;
				initials?: boolean;
				hyperlink?: boolean;
		  }
		| {
				class?: undefined;
		  }
	);
