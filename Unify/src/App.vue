<template>
  <div>
  <Navbar 
    :pages="pages"
    :active-page="activePage"
    :nav-link-click="(index) => activePage = index"
  ></Navbar>
  <p>This is the home page</p>
  </div>
</template>

<script>
import Navbar from './components/Navbar.vue';
import PageViewer from './components/PageViewer.vue';

export default {
  components: {
    PageViewer,
    Navbar
  },
  data() 
  {
    return {
        activePage: 0,
        useDarkNavbar: false,
        pages: [
            {
                link: {text:'Home', url:'index.html'},
                pageTitle: 'Home Page',
                content: 'This is the home content'
            },
            {
                link: {text:'Study Journal', url:'journal.html'},
                pageTitle: 'Study Journal',
                content: 'This is a page to help students record topics they have finished'
            },
            {
                link: {text: 'Well-being tracker', url: 'tracker.html'},
                pageTitle: 'Well-being Tracker ',
                content: 'This is a page to help students track their sleep and mental well-being'

            },
            {
                link: {text: 'Study tips and tricks', url: 'study.html'},
                pageTitle: 'Study tips and tricks',
                content: 'This is a page that provides students with tips and tricks to help them study'
            },
            {
                link: {text: 'Nutrition and exercise tracker', url:'nutrition.html'},
                pageTitle: 'Nutrition and Exercise Tracker',
                content: 'This is a page that tracks nutrition and exercise.'
            },
            {
                link: {text: 'Calendar', url:'calendar.html'},
                pageTitle: 'Calendar',
                content: 'This is a page that allows students to fill in and keep track of their calendar'
            },
            {
                link: {text:'Recommendations', url:'recommendations.html'},
                pageTitle:'Recommendations',
                content:'This is a page that allows students to view recommendations throughout the day'
            }
        ]
        
    };
  }
    };
</script>

<style>
/* Optional: custom styles here */
</style>
