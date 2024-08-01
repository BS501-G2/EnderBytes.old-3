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
      <Title title="User List" />
      <div class="recent-text-container">
        <p class="recent-text-paragraph">User List</p>
        <div class="recent-files-container">
          <div class="header">
            <nav class="nav">
              <ul>
                <li class="nav-link">
                  <a href="#name">Name</a>
                </li>
                <li class="nav-link">
                  <a href="#email">Email</a>
                </li>
                <li class="nav-link">
                  <a href="#recent">Recent</a>
                </li>
                <li class="nav-link">
                  <a href="#upload">Upload</a>
                </li>
              </ul>
            </nav>
          </div>
          <div class="find-friend-container">
            <div class="find-friends-header">
              <div class="search">
                <input type="text" placeholder="Search..." />
              </div>
              <div class="dropdown">
                <button class="dropbtn">...</button>
                <div class="dropdown-content">
                  <a href="#Deleteall">Delete All</a>
                  <a href="#Editpricavy">Edit Privacy</a>
                  <a href="#Manageblocking">Manage Blocking</a>
                </div>
              </div>
              <div class="find-friends-body">
                <div class="user-row">
                  <div class="user-info">
                    <img src="" alt="image" />
                    <span>Kodi Santos, Chan</span>
                  </div>
                  <button class="button"><span>...</span></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  {/key}
{/snippet}

<style>
  .button {
    border-radius: 4px;
    background-color: #0f3031ff;
    border: none;
    color: #ffffff;
    text-align: center;
    transition: all 0.5s;
    cursor: pointer;
    margin: 5px;
  }
  .button span {
    cursor: pointer;
    display: inline-block;
    position: relative;
    transition: 0.5s;
  }
  .button span:after {
    content: '\00bb';
    position: absolute;
    opacity: 0;
    top: 0;
    right: -20px;
    transition: 0.5s;
  }

  .button:hover span {
    padding-right: 25px;
  }

  .button:hover span:after {
    opacity: 1;
    right: 0;
  }
  .find-friends-body {
    background-color: #3e8e41;
    margin: auto;
    width: 400px;
    border-radius: 4px;
    position: absolute;
    top: 300px;
    left: 80px;
  }
  .user-row {
    padding: 20px 30px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .user-info {
    display: flex;
    align-items: center;
  }
  .user-info img {
    width: 70px;
    border-radius: 50%;
    margin-right: 15px;
  }
  .dropbtn {
    background-color: #0f3031ff;
    color: white;
    padding: 10px;
    font-size: 16px;
    border: none;
    cursor: pointer;
    border-radius: 10px;
  }

  .dropdown {
    position: absolute;
    display: inline-block;
    top: 119px;
    left: 1350px;
  }

  .dropdown-content {
    display: none;
    position: absolute;
    background-color: white;
    min-width: 140px;
    box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
    z-index: 1;
  }

  .dropdown-content a {
    color: black;
    padding: -5px 20px;
    text-decoration: none;
    display: block;
    justify-content: center;
    text-align: center;
  }

  .dropdown-content a:hover {
    background-color: #f1f1f1;
  }

  .dropdown:hover .dropdown-content {
    display: block;
  }

  .dropdown:hover .dropbtn {
    background-color: #3e8e41;
  }
  .find-friends-header .search {
    position: relative;
  }
  .find-friends-header .search input {
    position: absolute;
    top: -280px;
    left: 1100px;
    border: none;
    outline: none;
    width: calc(100% - 1400px);
    font-size: 15px;
    color: #d0e7f8;
    background-color: #0f3031ff;
    padding: 15px;
    border-radius: 40px;
  }
  .find-friends-header .search input::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
  .nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .nav ul {
    display: flex;
    align-items: center;
    list-style: none;
  }
  .nav li {
    position: relative;
    top: -80px;
    left: 75px;
  }
  .nav a {
    white-space: nowrap;
    padding: 15px 20px;
    display: flex;
    aling-items: center;
    font-size: 1.2rem;
    font-weight: 700;
    color: #0f3031ff;
    text-decoration: none;
    transition: color 0.3s ease;
  }
  .nav li:hover a {
    color: #3e8e41;
  }
  .nav-link::before {
    content: '';
    position: absolute;
    width: 0;
    height: 3px;
    bottom: 5px;
    left: 50%;
    transform: translateX(-56%);
    background-color: #3e8e41;
    visibility: hidden;
    transition: all 0.3s ease-in-out 0s;
  }
  .nav-link:hover:before {
    visibility: visible;
    width: 100%;
  }
  .recent-text-paragraph {
    position: relative;
    left: 25px;
  }
  .recent-text-container {
    position: relative;
    padding: 20px;
    top: -50px;
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
  .file {
    display: grid;
    grid-template-columns: 50% 20% 20% 10%;
    margin: 20px;
    border-bottom: 1px var(--onPrimaryContainerVariant) solid;
  }
  .file:hover .more-icon {
    visibility: visible;
  }
  .file-icons {
    display: flex;
    align-items: center;
  }
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
      position: relative;
      padding: 10px;
      top: 50px;
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
