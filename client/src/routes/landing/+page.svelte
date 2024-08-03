<script>
  import { viewMode, ViewMode } from '@rizzzi/svelte-commons';
</script>

<div
  class="landing"
  class:desktop={$viewMode & ViewMode.Desktop}
  class:mobile={$viewMode & ViewMode.Mobile}
>
  <div class="firstGrid-Container" id="home">
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

  <div class="secondGrid-Container">
    <div class="gridVid">
      <video src="SecurityWhiteMG.mp4" muted loop autoplay playsinline></video>
    </div>
     <div class="gridInfo2">
      <h1>Store, share, and collaborate <br>on files and folders across <br>your phone, tablet, or computer.</h1>
      <p>this section is for Security.---------Secure and Private File Storage and Sharing Website <br> for Melchora Aquino Elementary School.</p>
    </div>
  </div>

  <hr>

  <div class="secondGrid-Container">
     <div class="gridInfo2">
      <h1>Store, share, and collaborate <br>on files and folders across <br>your phone, tablet, or computer.</h1>
      <p>this section is for collaboration.------Secure and Private File Storage and Sharing Website <br> for Melchora Aquino Elementary School.</p>
    </div>
    <div class="gridVid1">
      <video src="CollaborationMG.mp4" muted loop autoplay playsinline></video>
    </div>
  </div>

  <hr>

   <div class="secondGrid-Container">
     <div class="gridInfo2">
      <h1>Store, share, and collaborate <br>on files and folders across <br>your phone, tablet, or computer.</h1>
      <p>this section is for ADMIN.---------Secure and Private File Storage and Sharing Website <br> for Melchora Aquino Elementary School.</p>
    </div>
     <div class="gridVid">
      <video src="AdminWhiteMG.mp4" muted loop autoplay playsinline></video>
    </div>
  </div>

  <hr>

  <div class="Contact" id="contact">
     <div class="contactDetails">
      <h1>Contact <span class="highlight">Us</span></h1>
      <p>Have any questions? We'd love to hear from you.</p>
    </div>
     <div class="contactGrid-Container">
      <div class="Card">
        <i class="fas fa-envelope"></i>
        <h3>Email</h3>
        <p>contact@example.com</p>
      </div>
      <div class="Card">
        <i class="fas fa-phone"></i>
        <h3>Phone</h3>
        <p>+639 1234 567 890</p>
      </div>
      <div class="Card">
        <i class="fas fa-map-marker-alt"></i>
        <h3>Office</h3>
        <p>123 Main Street, City, Country</p>
      </div>
    </div>
  </div>

  <hr>

</div>

<style lang="scss">
  div.landing{
    overflow-y: auto;
    background-color: #FFFF;
    font-family: Arial, sans-serif;
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
    padding:30px;
  }
  div.Contact {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    min-height:900px;
  }
  .contactDetails h1 {
    font-size: 4em;
    margin: 0;
    padding:70px;
  }
   .contactDetails p {
    font-size: 2em;
    margin: 0;
    padding:10px;
  }

  .contactDetails .highlight {
    color: #86c24fff;
  }
  div.contactGrid-Container {
    display: grid;
    place-items: center;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 70px;
    width: 80%;
    max-width: 1000px;
    padding: 20px;
    background-color: #fff;
    border-radius: 8px;
    padding:70px;
  }
  div.Card {
    background-color: rgba(255, 255, 255, 0.8);
    color: black;
    padding: 20px;
    border-radius: 8px;
    text-align: center;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.25);
    transition: transform 0.3s, background-color 0.3s;
    min-height:100%;
    min-width:100%;

  }
  .Card i {
    font-size: 2em;
    margin-bottom: 10px;
    color: #86c24fff;
    transition: color 0.3s;
  }

  .Card:hover i {
    color: white;
  }

  div.Card:hover {
    background-color: #86c24fff;
    color: white;
    transform: translateY(-5px);
  }

  div.Card h3 {
    margin: 0 0 10px;
    font-size: 1.5em;
    padding:10px;
  }

  div.Card p {
    margin: 0;
    font-size: 1.2em;
    padding:20px;
  }


  div.landing.desktop {
    padding-top: 72px;

  }

  div.landing.mobile {
    padding-bottom: 64px;
  }
</style>
