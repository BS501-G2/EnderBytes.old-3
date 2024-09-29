<script lang="ts" module>
	import type { FileResource, Mime } from "@rizzzi/enderdrive-lib/shared";

	export interface FileViewProps {
		file: FileResource;
		filePathChain: FileResource[];

		viruses: string[];
		mime: Mime;
	}
</script>

<script lang="ts">
</script>
