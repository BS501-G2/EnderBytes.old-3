import type { UserResource } from "@rizzzi/enderdrive-lib/shared";

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
