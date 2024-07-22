<script lang="ts">
  import { Title } from "@rizzzi/svelte-commons";
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
          <p class="file-info">resume.docx</p>
        </div>
        <div class="file-date">
          <p class="file-info">2/24/24</p>
        </div>
        <div class="file-size">
          <p class="file-info">2 MB</p>
        </div>
      </div>

      <div class="file">
        <div class="file-name">
          <p class="file-info">resume.docx</p>
        </div>
        <div class="file-date">
          <p class="file-info">2/24/24</p>
        </div>
        <div class="file-size">
          <p class="file-info">2 MB</p>
        </div>
      </div>

      <div class="file">
        <div class="file-name">
          <p class="file-info">resume.docx</p>
        </div>
        <div class="file-date">
          <p class="file-info">2/24/24</p>
        </div>
        <div class="file-size">
          <p class="file-info">2 MB</p>
        </div>
      </div>

      <div class="file">
        <div class="file-name">
          <p class="file-info">resume.docx</p>
        </div>
        <div class="file-date">
          <p class="file-info">2/24/24</p>
        </div>
        <div class="file-size">
          <p class="file-info">2 MB</p>
        </div>
      </div>

      <div class="file">
        <div class="file-name">
          <p class="file-info">resume.docx</p>
        </div>
        <div class="file-date">
          <p class="file-info">2/24/24</p>
        </div>
        <div class="file-size">
          <p class="file-info">2 MB</p>
        </div>
      </div>

      <div class="file">
        <div class="file-name">
          <p class="file-info">resume.docx</p>
        </div>
        <div class="file-date">
          <p class="file-info">2/24/24</p>
        </div>
        <div class="file-size">
          <p class="file-info">2 MB</p>
        </div>
      </div>

      <div class="file">
        <div class="file-name">
          <p class="file-info">resume.docx</p>
        </div>
        <div class="file-date">
          <p class="file-info">2/24/24</p>
        </div>
        <div class="file-size">
          <p class="file-info">2 MB</p>
        </div>
      </div>

      <div class="file">
        <div class="file-name">
          <p class="file-info">resume.docx</p>
        </div>
        <div class="file-date">
          <p class="file-info">2/24/24</p>
        </div>
        <div class="file-size">
          <p class="file-info">2 MB</p>
        </div>
      </div>

      <div class="file">
        <div class="file-name">
          <p class="file-info">resume.docx</p>
        </div>
        <div class="file-date">
          <p class="file-info">2/24/24</p>
        </div>
        <div class="file-size">
          <p class="file-info">2 MB</p>
        </div>
      </div>

      <div class="file">
        <div class="file-name">
          <p class="file-info">resume.docx</p>
        </div>
        <div class="file-date">
          <p class="file-info">2/24/24</p>
        </div>
        <div class="file-size">
          <p class="file-info">2 MB</p>
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
  }
  .recent-files-container{
    border-radius: 20px;
    background-color: var(--primaryContainer);
  }

  .recent-files-columns{
    padding-top: 10px;
    padding-bottom: 10px;
    display: grid;
    grid-template-columns: 50% 25% 25%;
    border-bottom: 1px var(--onPrimaryContainer) solid;
    padding: 20px;
  }
  .recent-files-file-container{
    /* padding: 20px; */
  }
  .file{
    display: grid;
    grid-template-columns: 50% 25% 25%;
    margin: 20px;
    border-bottom: 1px var(--onPrimaryContainer) solid;
  }

  .recent-text-paragraph{
    font-size: clamp(15px, 3vw + .5rem , 30px);
  }
  .column-texts{
    font-size: clamp(12px, 3vw + .5rem, 24px);
  }

    @media(max-width: 768px){

      .recent-files-columns{
        grid-template-columns: 33% 33% 33%;
      }
      .file{
        grid-template-columns: 33% 33% 33%;
      }
      .feed-container{
        width: 100vw;
      }
    }
</style>
