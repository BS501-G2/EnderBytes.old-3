<script>
  import { viewMode, ViewMode } from '@rizzzi/svelte-commons';
</script>

<div
  class="landing"
  class:desktop={$viewMode & ViewMode.Desktop}
  class:mobile={$viewMode & ViewMode.Mobile}
>
  <div class=firstGrid-Container>
    <div class="gridInfo1">
      <h1>Store, share, and collaborate <br>on files and folders across <br>your phone, tablet, or computer.</h1>
      <p>Secure and Private File Storage and Sharing Website <br> for Melchora Aquino Elementary School.</p>

      <div class="button-container1">
        <button class="btn btn-primary">Download</button>
        <button class="btn btn-secondary">Go to Dashboard</button>
      </div>
    </div>
    <div class="gridImage1">
      <img src="first.png" alt="first">
    </div>
  </div>

  <hr>

  <div class=secondGrid-Container>
    <div class="gridVid">
      <video src="SecurityWhiteMG.mp4" muted loop autoplay playsinline></video>
    </div>
     <div class="gridInfo2">
      <h1>Store, share, and collaborate <br>on files and folders across <br>your phone, tablet, or computer.</h1>
      <p>this section is for Security.---------Secure and Private File Storage and Sharing Website <br> for Melchora Aquino Elementary School.</p>
    </div>
  </div>

  <hr>

  <div class=secondGrid-Container>
     <div class="gridInfo2">
      <h1>Store, share, and collaborate <br>on files and folders across <br>your phone, tablet, or computer.</h1>
      <p>this section is for collaboration.------Secure and Private File Storage and Sharing Website <br> for Melchora Aquino Elementary School.</p>
    </div>
    <div class="gridVid1">
      <video src="CollaborationMG.mp4" muted loop autoplay playsinline></video>
    </div>
  </div>

  <hr>

   <div class=secondGrid-Container>
     <div class="gridInfo2">
      <h1>Store, share, and collaborate <br>on files and folders across <br>your phone, tablet, or computer.</h1>
      <p>this section is for ADMIN.---------Secure and Private File Storage and Sharing Website <br> for Melchora Aquino Elementary School.</p>
    </div>
     <div class="gridVid">
      <video src="AdminWhiteMG.mp4" muted loop autoplay playsinline></video>
    </div>
  </div>

  <hr>

  <div class=Contact>
     <div class="contactDetails">
      <h1>Contact Us</h1>
      <p>Have any questions? We'd love to hear from you.</p>
    </div>
     <div class="contact-Container">
      <div class="Email"> </div>
      <div class="Phone"> </div>
      <div class="Office"> </div>
    </div>
  </div>

  <hr>

</div>

<style lang="scss">
  div.landing{
    overflow-y: auto;
    background-color: #FFFF;
  }

  div.firstGrid-Container{
    display:grid;
    place-items: center;
    grid-template-columns: auto auto;
    padding:200px;
    gap: 20px;
  }
  div.gridInfo1{
    max-width: 100%;
    max-height: 100%;
    padding-bottom:150px;
    overflow: hidden;
  }
  div.gridImage1{
    max-width: 100%;
    max-height: 100%;
    object-fit: cover;
    padding-bottom:70px;
    overflow: hidden;
  }
  p{
    padding:10px;
    font-size: 25px;
  }
  h1{
    padding:10px;
    font-size: 45px;
  }
  div.button-container1 {
    margin-top: 20px;
    padding:10px;
    gap: 20px;
  }

  .btn {
    margin-right: 10px;
    padding: 10px 20px;
    border: 2px solid transparent;
    border-radius: 5px;
    cursor: pointer;
    font-size: 20px;
    transition: border-color 0.3s, box-shadow 0.3s;
  }
  .btn-primary {
    background-color: #86c24fff;
    color: black;
  }
  .btn-secondary {
    background-color: #0f3031ff;
    color: white;
  }
  .btn:hover {
    border-color: white;
    box-shadow: 0 0 10px white;
  }
  hr {
      border: none;
      height: 1px;
      background-color: #86c24fff;
      opacity: 0.5;
      margin: 20px auto;
      width: 75%;
    }
  div.secondGrid-Container{
    display:grid;
    place-items: center;
    grid-template-columns: auto auto;
    padding:200px;
    gap: 20px;
    overflow: hidden;
  }
  div.gridInfo2{
    max-width: 100%;
    max-height: 100%;
    padding-bottom:200px;
    overflow: hidden;
  }
  div.gridVid{
    max-width: 100%;
    max-height: 100%;
    border-radius: 20px;
    overflow: hidden;
    padding-bottom:70px;

  }
   div.gridVid video {
    max-width: 100%;
    min-height: 100%;
    object-fit: cover;
    border-radius: inherit;
    overflow: hidden;

  }
  div.gridVid1 video {
    max-width: 100%;
    min-height: 600px;
    object-fit: cover;
    border-radius: inherit;
    overflow: hidden;
  }
  div.contactDetails{
    text-align:center;
  }

  div.landing.desktop {
    padding-top: 72px;

  }

  div.landing.mobile {
    padding-bottom: 64px;
  }
</style>
