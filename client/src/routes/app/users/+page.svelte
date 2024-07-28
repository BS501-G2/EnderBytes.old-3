<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import { page } from '$app/stores';
  import { UserResolveType, type UserResolvePayload } from '@rizzzi/enderdrive-lib/shared';
  import { DashboardContextName, type DashboardContext } from '../dashboard.svelte';

  import { Title } from '@rizzzi/svelte-commons';

  import ProfilePage from './profile-page.svelte';
  import { authentication } from '$lib/client/client';

  const parse = (): UserResolvePayload | null => {
    const idenfierString = $page.url.searchParams.get('id');
    if (idenfierString != null) {
      if (idenfierString.startsWith('@')) {
        return [UserResolveType.Username, idenfierString.substring(1)];
      } else if (idenfierString.startsWith(':')) {
        return [UserResolveType.UserId, Number.parseInt(idenfierString.substring(1))];
      } else if (idenfierString == '!me') {
        return [UserResolveType.UserId, $authentication!.userId];
      }
    }
    return null;
  };

  let resolve: UserResolvePayload | null = $derived(parse());

  const { setMainContent }: DashboardContext = getContext<DashboardContext>(DashboardContextName);

  onMount(() => setMainContent(layout));
</script>

{#snippet layout()}
  {#key resolve}
    {#if resolve != null}
      <ProfilePage {resolve} />
    {:else}
      <pre>
      <Title title="UserList" />
     <div class="feed-container">
  <div class="recent-text-container">
  <p class="recent-text-paragraph">User List</p>
  </div>

  <div class="recent-files-container">

    <div class="recent-files-columns">
      <div class="name-column">
        <p class="column-texts">First Name</p>
      </div>
      <div class="date-column">
        <p class="column-texts">Last Name</p>
      </div>
      <div class="size-column">
        <p class="column-texts">Email</p>
      </div>
    </div>

    <div class="recent-files-file-container">
      <div class="file">
        <div class="file-name">
          <p class="file-name-text">resume.docx</p>
        </div>
         <div class="file-name">
          <p class="file-name-text">resume.docx</p>
        </div>
         <div class="file-name">
          <p class="file-name-text">resume.docx</p>
        </div>
        <div class="file-size">
          <p class="file-size-text">2 MB</p>
        </div>
        <div class="file-date">
          <p class="file-date-text">2/24/24</p>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
          .recent-text-container {
            padding: 20px;
          }

          .feed-container {
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            padding: 20px;
            overflow: auto;
          }
          .recent-files-container {
            border-radius: 20px;
            background-color: var(--primaryContainerVariant);
          }

          .recent-files-columns {
            display: grid;
            border-top-left-radius: 20px;
            border-top-right-radius: 20px;
            grid-template-columns: 50% 20% 20%;
            background-color: var(--primaryContainerVariant);
            border-bottom: 1px var(--onPrimaryContainerVariant) solid;
            padding: 20px;
            position: sticky;
            top: -20px;
            opacity: 100;
          }
          .file-name-text,
          .file-date-text,
          .file-size-text {
            font-size: clamp(10px, 1vw + 0.5rem, 20px);
          }

          .file {
            display: grid;
            grid-template-columns: 50% 20% 20% 10%;
            margin: 20px;
            border-bottom: 1px var(--onPrimaryContainerVariant) solid;
          }
          .file:hover .fav-icon {
            visibility: visible;
          }
          .file:hover .share-icon {
            visibility: visible;
          }
          .file:hover .more-icon {
            visibility: visible;
          }
          .file-icons {
            display: flex;
            align-items: center;
          }
          .fav-icon,
          .share-icon,
          .more-icon {
            margin-left: 5px;
            margin-right: 5px;
            visibility: hidden;
          }
          .recent-text-paragraph {
            font-size: clamp(15px, 3vw + 0.5rem, 30px);
          }
          .column-texts {
            font-size: clamp(12px, 3vw + 0.5rem, 24px);
          }

          @media (max-width: 768px) {
            .recent-files-container {
              border-radius: 5px;
            }
            .recent-files-columns {
              grid-template-columns: 33% 33% 33%;
              top: 0px;
              padding: 5px;
              display: none;
            }
            .recent-text-container {
              padding: 5px;
            }
            .file {
              grid-template-columns: 50% 30% 20%;
              grid-template-rows: 50% 50%;
              margin: 5px;
            }
            .file-icons {
              isplay: grid;
              grid-template-columns: auto;
              grid-area: 1 / 3 / 3 / 4;
              align-items: center;
              justify-content: center;
            }
            .fav-icon,
            .share-icon,
            .more-icon {
              visibility: visible;
            }
            .fav-icon,
            .share-icon {
              display: none;
            }

            .file-name-text {
              font-weight: bolder;
              font-size: clamp(12px, 2vw + 0.5rem, 24px);
            }
            .feed-container {
              width: 100vw;
              padding: 0px;
              padding-bottom: 5px;
            }
            .file-date {
              grid-column: 1;
              grid-row: 2;
            }
            .file-size {
              grid-column: 2;
              grid-area: 1 / 2 / 3 / 3;
              display: flex;
              justify-content: center;
              align-items: center;
            }
          }
        </style>

    </pre>
    {/if}
  {/key}
{/snippet}
