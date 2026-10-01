package main

import (
	"fmt"
	"os"
	"regexp"
)

func main() {
	data, err := os.ReadFile("test_catalog.html")
	if err != nil {
		fmt.Println("Err:", err)
		return
	}
	html := string(data)
	regex := regexp.MustCompile(`\{id:"(\d+)",title:"([^"]+)",synopsis:"((?:[^"\\]|\\.)*)",categoryId:\d+,slug:"([^"]+)"`)
	matches := regex.FindAllStringSubmatch(html, -1)
	fmt.Printf("Total catalog items parsed from page: %d\n", len(matches))
	for i, m := range matches {
		if i < 5 {
			fmt.Printf("[%d] ID=%s, Slug=%s, Title=%s\n", i+1, m[1], m[4], m[2])
		}
	}
}
