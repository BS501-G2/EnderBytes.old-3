<script lang="ts" module>
	const randomPasswordDictionary: string =
		'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	function getRandomPassword(): string {
		let password = '';
		for (let i = 0; i < 16; i++) {
			password +=
				randomPasswordDictionary[Math.floor(Math.random() * randomPasswordDictionary.length)];
		}
		return password;
	}
</script>

<script lang="ts">
	import { goto } from '$app/navigation';

	import { getConnection2 } from '$lib/client/client';

	import { Button, Dialog, Input } from '@rizzzi/svelte-commons';
	import { writable, type Writable } from 'svelte/store';

	const { onDismiss }: { onDismiss: () => void } = $props();
	const {
		serverFunctions: { createUser }
	} = getConnection2();

	const username = writable('');
	const password = writable(getRandomPassword());
	const firstName = writable('');
	const middleName = writable('');
	const lastName = writable('');
</script>

<Dialog dialogClass="normal" {onDismiss}>
	{#snippet head()}
		<h2>New User</h2>
	{/snippet}

	{#snippet body()}
		{#snippet field(name: string, value: Writable<string>)}
			<Input type="text" {name} {value} />
		{/snippet}

		<div class="dialog">
			<div class="form">
				{@render field('Username', username)}
				{@render field('Password', password)}
				{@render field('First Name', firstName)}
				{@render field('Middle Name', middleName)}
				{@render field('Last Name', lastName)}
			</div>

			<div class="submit">
				<Button
					onClick={async () => {
						const [user] = await createUser(
							$username,
							$firstName,
							$middleName || null,
							$lastName,
							$password,
							'Member'
						);

						await goto(`/app/users?id=@${user.username}`);
					}}
				>
					<div class="submit-button">
						<p>Create an Account</p>
					</div>
				</Button>
			</div>
		</div>
	{/snippet}
</Dialog>

<style lang="scss">
	div.dialog {
		display: flex;
		flex-direction: column;

		gap: 8px;
	}

	div.form {
		display: grid;
		grid-template-columns: 1fr 1fr;
		grid-gap: 8px;
	}

	div.submit {
		display: flex;
		flex-direction: column;
	}
	div.submit-button {
		padding: 8px;
	}
</style>
