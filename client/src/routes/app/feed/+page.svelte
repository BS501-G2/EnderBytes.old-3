<script lang="ts">
  import { Title } from "@rizzzi/svelte-commons";
  import {MoreVerticalIcon} from "svelte-feather-icons";
</script>

<Title title="Feed" />


<div class="feed-container">
  <div class="recent-text-container">
  <p class="recent-text-paragraph">Recent Files</p>
  </div>

  <div class="recent-files-container">

    <div class="recent-files-columns">
      <div class="name-column">
        <p class="column-texts">Name</p>
      </div>
      <div class="date-column">
        <p class="column-texts">Date</p>
      </div>
      <div class="size-column">
        <p class="column-texts">Size</p>
      </div>
    </div>

    <div class="recent-files-file-container">
      <div class="file">
        <div class="file-name">
          <p class="file-name-text">resume.docx</p>
        </div>
        <div class="file-size">
          <p class="file-size-text">2 MB</p>
        </div>
        <div class="file-date">
          <p class="file-date-text">2/24/24</p>
        </div>
        <div class="file-icons">

        </div>

      </div>






    </div>
  </div>
</div>


<style>
  .recent-text-container{
    padding: 20px;


  }
  .feed-container{
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    padding: 20px;
    overflow: auto;
  }
  .recent-files-container{
    border-radius: 20px;
    background-color: var(--primaryContainerVariant);


  }

  .recent-files-columns{
    display: grid;
    border-top-left-radius: 20px;
    border-top-right-radius: 20px;
    grid-template-columns: 50% 20% 20%;
    background-color: var(--primaryContainerVariant);
    border-bottom: 1px var(--onPrimaryContainerVariant) solid;
    padding: 20px;
    position: sticky;
    top: -20px;
  }
  .file-name-text,.file-date-text,.file-size-text{
    font-size: clamp(10px, 1vw + .5rem, 20px);
  }

  .file{
    display: grid;
    grid-template-columns: 50% 20% 20% 10%;
    margin: 20px;
    border-bottom: 1px var(--onPrimaryContainerVariant) solid;
  }

  .recent-text-paragraph{
    font-size: clamp(15px, 3vw + .5rem , 30px);
  }
  .column-texts{
    font-size: clamp(12px, 3vw + .5rem, 24px);
  }

    @media(max-width: 768px){

      .recent-files-container{
        border-radius: 5px;
      }
      .recent-files-columns{
        grid-template-columns: 33% 33% 33%;
        top: 0px;
        padding: 5px;
        display: none;
      }
      .recent-text-container{
        padding: 5px;
      }
      .file{
        grid-template-columns: 50% 30% 20%;
        grid-template-rows: 50% 50%;
        margin: 5px;
      }
      .file-name-text{
        font-weight: bolder;
        font-size: clamp(12px, 2vw + .5rem, 24px);
      }
      .feed-container{
        width: 100vw;
        padding: 0px;
        padding-bottom: 5px;
      }
      .file-date{
        grid-column: 1;
        grid-row: 2;
      }
      .file-size{
        grid-column: 2;
        grid-area: 1 / 2 / 3 / 3;
        display: flex;
        justify-content: center;
        align-items: center;
      }
    }
</style>
