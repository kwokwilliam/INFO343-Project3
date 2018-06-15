# [Seattle SafeCycleJS](http://students.washington.edu/wkwok16/p3-mockingod1841/)

## Project Description

This project is a continuation of [Seattle SafeCycle](https://github.com/info201b-au17/bb4-finalproj) from my INFO 201 final project.

In INFO 201, while the project came out functional and got praise from those walking around, I saw many flaws that I wanted to address and fix, but didn't know enough of the ins and outs of R.

Unfortunately, the world around us isn't entirely moral, so we have to be wary about where we park out bikes. No matter what strong locks we use, our bikes have a good chance of getting itself or its parts stolen.

**Question**: How can we determine which bike rack is safe from thefts or not?

**The solution:** A tool that allows **bike riders** to find the best parking space nearby for their bike.

For my project, I worked with two datasets provided by the Seattle Department of Transportation:

* A list of all [bike racks](https://data.seattle.gov/Transportation/City-of-Seattle-Bicycle-Racks/vncn-umqp) in or around Seattle
* A list of all reported [bike thefts](https://data.seattle.gov/Public-Safety/Seattle-Police-Department-Police-Report-Incident/7ais-f98f) in or around Seattle.

## How to use
Click on an area on the map in order to see bikeracks within a 200 meter radius. Blue points will be the safest bike rack nearby. Click on a point to see more information about the bike rack itself and a graph of the history of thefts around the bike rack.

When you open the side panel, you can see more options. You can change the radius of bike racks you see, as well as the data I used. Along with that, there is a button that will allow you to see all the bike racks in Seattle. This will take at least 45 seconds on desktop and possibly more on mobile. It will freeze the page up. (Having a different tab in focus may slow down render time as well, depending on the browser). This is because calculations are done client side and not server side. (If you don't want to wait, trust that the button works.)
